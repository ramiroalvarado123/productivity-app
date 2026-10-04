"use client";
import Image from "next/image";
import type { Book, BookSuggestion } from "@/shared/data/types";
import { useState } from "react";

export function SavedBookCover({ book }: { book: Book }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (book.coverUrl && !imageFailed) {
    return <div className="book-cover book-cover-original"><Image src={book.coverUrl} alt={`Portada de ${book.title}`} width={70} height={98} unoptimized onError={() => setImageFailed(true)} /></div>;
  }
  return <div className="book-cover"><small>{book.author || "MI LIBRO"}</small><b>{book.title}</b></div>;
}

export function CatalogBookCover({ book, compact = false }: { book: BookSuggestion; compact?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (book.coverUrl && !imageFailed) return <Image src={book.coverUrl} alt={compact ? "" : `Portada de ${book.title}`} width={compact ? 35 : 96} height={compact ? 48 : 145} unoptimized onError={() => setImageFailed(true)} />;
  if (compact) return <span className="mini-book-placeholder">▱</span>;
  return <div className="result-book-placeholder"><span>▱</span><small>SIN PORTADA</small></div>;
}
