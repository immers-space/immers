import React, { useEffect, useState } from 'react'
import Post from './Post'

export default function Outbox ({ iri }) {
  const [page, setPage] = useState(iri)
  const [nextPage, setNextPage] = useState(undefined)
  const [items, setItems] = useState([])
  useEffect(() => {
    window.fetch(page, {
      headers: {
        Accept: 'application/activity+json'
      }
    }).then(res => res.json())
      .then(collectionPage => {
        if (!collectionPage.orderedItems && collectionPage.first) {
          setPage(collectionPage.first)
          return
        }
        setItems(items.concat(collectionPage.orderedItems))
        setNextPage(collectionPage.next)
      })
  }, [page])
  const handleNext = () => setPage(nextPage)
  return (
    <div>
      <div>
        {items.map(item => <Post key={item.id} {...item} />)}
      </div>
      {nextPage && <button onClick={handleNext}>Load more</button>}
    </div>
  )
}
