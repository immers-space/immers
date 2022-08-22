import React, { useEffect, useState, useContext } from 'react'
import Loader from '../components/Loader'
import Post from './Post'
import ServerDataContext from './ServerDataContext'

export default function Feed ({ iri, ...postProps }) {
  const [loading, setLoading] = useState(true)
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
        setLoading(false)
      })
  }, [page])
  const handleNext = () => setPage(nextPage)
  return loading
    ? <Loader />
    : (
      <div>
        <div>
          {items.map(item => <Post key={item.id} settings={postProps} {...item} />)}
        </div>
        {nextPage && <button onClick={handleNext}>Load more</button>}
      </div>
      )
}
