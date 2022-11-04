import React, { useEffect, useState } from 'react'
import { immersClient } from './utils/immersClient'
import Loader from '../components/Loader'
import Post from './Post'

export default function Feed ({ iri, ...postProps }) {
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(iri)
  const [nextPage, setNextPage] = useState(undefined)
  const [items, setItems] = useState([])

  useEffect(async () => {
    const collectionPage = await immersClient.activities.getObject(page)
    if (!collectionPage.orderedItems && collectionPage.first) {
      setPage(collectionPage.first)
      return
    }
    setItems(items.concat(collectionPage.orderedItems))
    setNextPage(collectionPage.next)
    setLoading(false)
  }, [page])
  const handleNext = () => setPage(nextPage)
  return loading
    ? <Loader />
    : (
      <div>
        <section>
          {items.map(item => <Post key={item.id} settings={postProps} {...item} />)}
        </section>
        {nextPage && <button className='secondary' onClick={handleNext}>Load more</button>}
      </div>
      )
}
