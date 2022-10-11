import React from 'react'
import DOMPurify from 'dompurify'

export default function SanitizedHTML ({ className, html, ...props }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((html)) }} {...props} />
}
