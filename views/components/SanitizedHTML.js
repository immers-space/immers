import React from 'react'
import DOMPurify from 'dompurify'

export default function SanitizedHTML ({ className, html }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((html)) }} />
}
