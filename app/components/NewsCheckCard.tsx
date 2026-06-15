'use client'

import { useState } from 'react'
import type { NewsArticle, NewsCheckResult } from '@/types'

interface NewsCheckCardProps {
  result: NewsCheckResult
  articles: NewsArticle[]
}

export default function NewsCheckCard({ result, articles }: NewsCheckCardProps) {
  const [showArticles, setShowArticles] = useState(false)

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          vs. Recent News · Last 7 days · GDELT
        </p>
        <span className="text-xs text-gray-400">{result.articles_used} articles</span>
      </div>

      {result.corroborations.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-emerald-700 mb-1">Corroborations</p>
          <ul className="space-y-1">
            {result.corroborations.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-emerald-500 mt-0.5">✓</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.contradictions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-700 mb-1">Contradictions</p>
          <ul className="space-y-1">
            {result.contradictions.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-amber-500 mt-0.5">⚠</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm italic text-gray-600">{result.overall}</p>

      <button
        onClick={() => setShowArticles((v) => !v)}
        className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
      >
        {showArticles ? 'Hide' : 'Show'} source articles ({articles.length})
      </button>

      {showArticles && (
        <ul className="space-y-1 border-t border-gray-200 pt-2">
          {articles.map((a, i) => (
            <li key={i}>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline line-clamp-1"
              >
                {a.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
