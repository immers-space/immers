import React, { useEffect, useState, useContext } from 'react'
import Post from './Post'
import ServerDataContext from './ServerDataContext'


export default function Feed ({ iri }) {
  const [page, setPage] = useState(iri)
  const [nextPage, setNextPage] = useState(undefined)
  const [items, setItems] = useState([])
  const { token } = useContext(ServerDataContext)

  useEffect(() => {
    const headers = {
      Accept: 'application/activity+json'
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    window.fetch(page, { headers })
      .then(res => res.json())
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
