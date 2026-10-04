-- AVORA: velocidad de lectura y guardado.
-- Ejecutar una vez en Supabase > SQL Editor. Es aditivo: no borra ni cambia datos
-- (salvo corregir libros que ya llegaron a su última página, ver al final).

-- 1) Índices por usuario + fecha -------------------------------------------------
-- Cada pantalla filtra por `user_email` y un rango de fechas: sin estos índices
-- Postgres recorre la tabla entera de todos los usuarios en cada consulta.
create index if not exists meals_user_date_idx            on public.meals (user_email, meal_date);
create index if not exists training_logs_user_date_idx    on public.training_logs (user_email, training_date);
create index if not exists reading_logs_user_date_idx     on public.reading_logs (user_email, log_date);
create index if not exists focus_sessions_user_date_idx   on public.focus_sessions (user_email, session_date);
create index if not exists calendar_events_user_date_idx  on public.calendar_events (user_email, event_date, event_time);
create index if not exists tasks_user_due_idx             on public.tasks (user_email, due_date);
create index if not exists goals_user_idx                 on public.goals (user_email, target_date);
create index if not exists books_user_idx                 on public.books (user_email, created_at desc);
create index if not exists book_notes_user_idx            on public.book_notes (user_email, created_at desc);
create index if not exists exercise_logs_training_log_idx on public.exercise_logs (training_log_id);
create index if not exists exercise_logs_user_idx         on public.exercise_logs (user_email, created_at desc);
create index if not exists focus_projects_user_idx        on public.focus_projects (user_email, created_at);
create index if not exists daily_checkins_user_date_idx   on public.daily_checkins (user_email, entry_date);

-- 2) Entrenamientos en un solo viaje ------------------------------------------------
-- Antes, marcar un día hacía 3–4 consultas en cadena (¿la disciplina es tuya?,
-- ¿ya había registro?, ¿tiene ejercicios?, borrar/insertar). Ahora es una sola
-- llamada y todo-o-nada. `security invoker`: respeta las mismas políticas RLS.

create or replace function public.avora_toggle_training(p_discipline_id bigint, p_date text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_email text := auth.jwt() ->> 'email';
  v_log public.training_logs;
begin
  if v_email is null then raise exception 'Necesitás iniciar sesión.'; end if;
  if p_date !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Entrenamiento inválido.'; end if;
  perform 1 from public.training_disciplines where id = p_discipline_id and user_email = v_email;
  if not found then raise exception 'Entrenamiento inválido.'; end if;

  select * into v_log from public.training_logs
    where user_email = v_email and discipline_id = p_discipline_id and training_date = p_date;
  if found then
    if v_log.duration_minutes > 0 or v_log.distance_meters > 0 or v_log.notes <> ''
       or exists (select 1 from public.exercise_logs where training_log_id = v_log.id) then
      raise exception 'Este día tiene detalles cargados. Borrá sus registros antes de desmarcarlo.';
    end if;
    delete from public.training_logs where id = v_log.id;
    return jsonb_build_object('removed', v_log.id);
  end if;

  insert into public.training_logs (user_email, discipline_id, training_date)
    values (v_email, p_discipline_id, p_date)
    on conflict (user_email, discipline_id, training_date) do update set training_date = excluded.training_date
    returning * into v_log;
  return jsonb_build_object('row', to_jsonb(v_log));
end;
$$;

-- La planilla de gimnasio: reemplaza los ejercicios de la sesión de una vez.
-- p_exercises: [{ "id"?: number, "exercise", "weight_deci_kg", "sets", "reps", "is_record" }]
-- (los límites ya vienen aplicados desde la API).
create or replace function public.avora_save_exercises(p_discipline_id bigint, p_date text, p_exercises jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_email text := auth.jwt() ->> 'email';
  v_log public.training_logs;
  v_item jsonb;
  v_row public.exercise_logs;
  v_keep bigint[];
  v_removed bigint[];
  v_rows jsonb := '[]'::jsonb;
begin
  if v_email is null then raise exception 'Necesitás iniciar sesión.'; end if;
  if p_date !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Elegí una disciplina y fecha válidas.'; end if;
  perform 1 from public.training_disciplines where id = p_discipline_id and user_email = v_email;
  if not found then raise exception 'Elegí una disciplina y fecha válidas.'; end if;

  select * into v_log from public.training_logs
    where user_email = v_email and discipline_id = p_discipline_id and training_date = p_date;
  if not found then
    if jsonb_array_length(coalesce(p_exercises, '[]'::jsonb)) = 0 then
      return jsonb_build_object('log', null, 'rows', '[]'::jsonb, 'removed', '[]'::jsonb);
    end if;
    insert into public.training_logs (user_email, discipline_id, training_date)
      values (v_email, p_discipline_id, p_date)
      returning * into v_log;
  end if;

  select coalesce(array_agg((item ->> 'id')::bigint), '{}') into v_keep
    from jsonb_array_elements(coalesce(p_exercises, '[]'::jsonb)) item
    where coalesce((item ->> 'id')::bigint, 0) > 0;

  with gone as (
    delete from public.exercise_logs
      where training_log_id = v_log.id and user_email = v_email and not (id = any(v_keep))
      returning id
  )
  select coalesce(array_agg(id), '{}') into v_removed from gone;

  for v_item in select * from jsonb_array_elements(coalesce(p_exercises, '[]'::jsonb)) loop
    v_row := null;
    if coalesce((v_item ->> 'id')::bigint, 0) > 0 then
      update public.exercise_logs set
        exercise = v_item ->> 'exercise',
        weight_deci_kg = (v_item ->> 'weight_deci_kg')::integer,
        sets = (v_item ->> 'sets')::integer,
        reps = (v_item ->> 'reps')::integer,
        is_record = (v_item ->> 'is_record')::boolean
      where id = (v_item ->> 'id')::bigint and training_log_id = v_log.id and user_email = v_email
      returning * into v_row;
    end if;
    if v_row.id is null then
      insert into public.exercise_logs (user_email, training_log_id, exercise, weight_deci_kg, sets, reps, is_record)
        values (v_email, v_log.id, v_item ->> 'exercise', (v_item ->> 'weight_deci_kg')::integer,
                (v_item ->> 'sets')::integer, (v_item ->> 'reps')::integer, (v_item ->> 'is_record')::boolean)
        returning * into v_row;
    end if;
    v_rows := v_rows || to_jsonb(v_row);
  end loop;

  return jsonb_build_object('log', to_jsonb(v_log), 'rows', v_rows, 'removed', to_jsonb(v_removed));
end;
$$;

grant execute on function public.avora_toggle_training(bigint, text) to authenticated;
grant execute on function public.avora_save_exercises(bigint, text, jsonb) to authenticated;

-- 3) Libros terminados ------------------------------------------------------------
-- La lectura de datos ya no escribe: los libros que llegaron a su última página
-- quedan marcados como leídos una sola vez acá (al guardar páginas ya se marca solo).
update public.books set status = 'read'
  where status = 'reading' and total_pages > 0 and current_page >= total_pages;

notify pgrst, 'reload schema';
