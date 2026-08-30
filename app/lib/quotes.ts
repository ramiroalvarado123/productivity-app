/**
 * Frase del día. La selección es determinística por fecha: el mismo día siempre
 * muestra la misma frase, sin estado guardado y sin llamadas de red.
 *
 * Criterio de curaduría: pensamiento serio sobre carácter, atención, trabajo y
 * hábito. Mayoría de fuentes clásicas de dominio público, citadas por autor.
 */

export type Quote = { text: string; author: string; note: string };

export const quotes: Quote[] = [
  { text: "No es que tengamos poco tiempo, sino que perdemos mucho.", author: "Séneca", note: "Sobre la brevedad de la vida" },
  { text: "Nunca es tarde para empezar a vivir de acuerdo con la razón.", author: "Séneca", note: "Cartas a Lucilio" },
  { text: "Empezá de nuevo. Nadie te impide volver a ser quien querías ser.", author: "Marco Aurelio", note: "Meditaciones" },
  { text: "La calidad de tu vida depende de la calidad de tus pensamientos.", author: "Marco Aurelio", note: "Meditaciones" },
  { text: "Hacé cada cosa como si fuera la última de tu vida.", author: "Marco Aurelio", note: "Meditaciones" },
  { text: "No son las cosas las que perturban, sino las opiniones sobre las cosas.", author: "Epicteto", note: "Enquiridión" },
  { text: "Primero decidí quién querés ser. Después hacé lo que hay que hacer.", author: "Epicteto", note: "Discursos" },
  { text: "Somos lo que hacemos repetidamente. La excelencia es un hábito.", author: "Aristóteles", note: "Atribuida, vía Will Durant" },
  { text: "Conocer a los demás es sabiduría; conocerse a uno mismo es iluminación.", author: "Lao Tsé", note: "Tao Te Ching" },
  { text: "El viaje de mil millas empieza con un solo paso.", author: "Lao Tsé", note: "Tao Te Ching" },
  { text: "No importa lo lento que vayas mientras no te detengas.", author: "Confucio", note: "Analectas" },
  { text: "La vida es realmente simple, pero insistimos en hacerla complicada.", author: "Confucio", note: "Analectas" },
  { text: "El que tiene un porqué para vivir puede soportar casi cualquier cómo.", author: "Friedrich Nietzsche", note: "El crepúsculo de los ídolos" },
  { text: "Quien lucha con monstruos debe cuidar de no convertirse en uno.", author: "Friedrich Nietzsche", note: "Más allá del bien y del mal" },
  { text: "Nuestra vida se desperdicia en detalles. Simplificá, simplificá.", author: "Henry David Thoreau", note: "Walden" },
  { text: "Las cosas no cambian; cambiamos nosotros.", author: "Henry David Thoreau", note: "Walden" },
  { text: "Lo que hay detrás y delante de nosotros es poco comparado con lo que hay dentro.", author: "Ralph Waldo Emerson", note: "Ensayos" },
  { text: "La única persona con la que estás destinado a competir es con vos mismo.", author: "Ralph Waldo Emerson", note: "Atribuida" },
  { text: "La mayoría de los hombres lleva una vida de silenciosa desesperación.", author: "Henry David Thoreau", note: "Walden" },
  { text: "Nada es tan fuerte como la suavidad, y nada tan suave como la fuerza real.", author: "Francisco de Sales", note: "Cartas" },
  { text: "El que sabe esperar obtiene lo que quiere.", author: "Benjamin Franklin", note: "Almanaque del pobre Richard" },
  { text: "Perder el tiempo es la más costosa de todas las pérdidas.", author: "Benjamin Franklin", note: "Almanaque del pobre Richard" },
  { text: "Si querés cambiar el mundo, empezá por hacer tu cama.", author: "Proverbio militar", note: "Máxima de instrucción" },
  { text: "No podemos dirigir el viento, pero sí ajustar las velas.", author: "Proverbio", note: "Atribuido a varios autores" },
  { text: "Todo el mundo piensa en cambiar el mundo, nadie piensa en cambiarse a sí mismo.", author: "León Tolstói", note: "Ensayos" },
  { text: "Los dos guerreros más poderosos son la paciencia y el tiempo.", author: "León Tolstói", note: "Guerra y paz" },
  { text: "La atención es la forma más rara y pura de generosidad.", author: "Simone Weil", note: "Cartas" },
  { text: "El arte de vivir consiste menos en eliminar problemas que en crecer con ellos.", author: "Bernard Baruch", note: "Atribuida" },
  { text: "Cuidá los minutos: las horas se cuidan solas.", author: "Lord Chesterfield", note: "Cartas a su hijo" },
  { text: "El hombre que mueve montañas empieza cargando piedras pequeñas.", author: "Proverbio", note: "Tradición china" },
  { text: "Un viaje de descubrimiento no es buscar tierras nuevas, sino mirar con ojos nuevos.", author: "Marcel Proust", note: "En busca del tiempo perdido" },
  { text: "Lo importante es no dejar de hacerse preguntas.", author: "Albert Einstein", note: "Entrevista, 1955" },
  { text: "En medio de la dificultad reside la oportunidad.", author: "Albert Einstein", note: "Atribuida" },
  { text: "La disciplina es elegir entre lo que querés ahora y lo que más querés.", author: "Abraham Lincoln", note: "Atribuida" },
  { text: "Dame seis horas para talar un árbol y usaré las primeras cuatro afilando el hacha.", author: "Abraham Lincoln", note: "Atribuida" },
  { text: "El éxito es ir de fracaso en fracaso sin perder el entusiasmo.", author: "Winston Churchill", note: "Atribuida" },
  { text: "Primero formamos nuestros hábitos; después ellos nos forman a nosotros.", author: "John Dryden", note: "Atribuida" },
  { text: "Nada en el mundo reemplaza a la persistencia.", author: "Calvin Coolidge", note: "Discurso, 1929" },
  { text: "El precio de cualquier cosa es la cantidad de vida que intercambiás por ella.", author: "Henry David Thoreau", note: "Walden" },
  { text: "La libertad no es hacer lo que uno quiere, sino querer lo que uno hace.", author: "Jean-Paul Sartre", note: "Atribuida" },
  { text: "Quien no sabe a qué puerto se dirige, ningún viento le es favorable.", author: "Séneca", note: "Cartas a Lucilio" },
  { text: "La suerte es lo que pasa cuando la preparación se encuentra con la oportunidad.", author: "Séneca", note: "Atribuida" },
  { text: "Sé lo que sos y hacelo bien.", author: "Michel de Montaigne", note: "Ensayos" },
  { text: "La cosa más grande del mundo es saber pertenecerse a uno mismo.", author: "Michel de Montaigne", note: "Ensayos" },
  { text: "Aprendé como si fueras a vivir siempre; viví como si fueras a morir mañana.", author: "Mahatma Gandhi", note: "Atribuida" },
  { text: "La fuerza no viene de la capacidad física, sino de una voluntad indomable.", author: "Mahatma Gandhi", note: "Escritos" },
  { text: "Lo que se hace por necesidad no cuenta; lo que se elige define.", author: "Marco Aurelio", note: "Meditaciones" },
  { text: "El tiempo es lo único que no se recupera. Todo lo demás vuelve.", author: "Séneca", note: "Sobre la brevedad de la vida" },
  { text: "El descanso también es parte del trabajo.", author: "Ovidio", note: "Ars amatoria" },
  { text: "El campo que descansa devuelve una cosecha generosa.", author: "Ovidio", note: "Ars amatoria" },
  { text: "Ningún viento sopla a favor del que no sabe adónde va.", author: "Michel de Montaigne", note: "Ensayos" },
  { text: "La paciencia es amarga, pero su fruto es dulce.", author: "Jean-Jacques Rousseau", note: "Emilio" },
  { text: "Actuá sin esperar el resultado. El resultado no depende de vos.", author: "Bhagavad Gita", note: "Capítulo II" },
  { text: "Es mejor el propio deber cumplido con imperfección que el ajeno cumplido bien.", author: "Bhagavad Gita", note: "Capítulo III" },
  { text: "El que vence a otros es fuerte; el que se vence a sí mismo, poderoso.", author: "Lao Tsé", note: "Tao Te Ching" },
  { text: "No juzgues cada día por lo que cosechás, sino por lo que sembrás.", author: "Robert Louis Stevenson", note: "Atribuida" },
  { text: "La atención sostenida es la raíz del juicio, del carácter y de la voluntad.", author: "William James", note: "Principios de psicología" },
  { text: "Hacé de tu sistema nervioso un aliado y no un enemigo.", author: "William James", note: "Principios de psicología" },
  { text: "La duda mata más sueños que el fracaso.", author: "Proverbio", note: "Dicho popular" },
  { text: "No busques que las cosas pasen como querés; querelas como pasan.", author: "Epicteto", note: "Enquiridión" },
];

/** Elige una frase de forma estable a partir de la fecha ISO (YYYY-MM-DD). */
export function quoteForDate(date: string): Quote {
  let hash = 0;
  for (let index = 0; index < date.length; index += 1) {
    hash = (hash * 31 + date.charCodeAt(index)) % 1_000_003;
  }
  return quotes[hash % quotes.length];
}
