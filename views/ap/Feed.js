import React, { useState } from 'react'
import { immersClient } from './utils/immersClient'
import { useAsyncEffect } from './utils/useAsyncEffect'
import Loader from '../components/Loader'
import Post from './Post'

export default function Feed ({ iri, ...postProps }) {
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(iri)
  const [nextPage, setNextPage] = useState(undefined)
  const [items, setItems] = useState([])

  useAsyncEffect(async () => {
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
  const handleRemove = (id) => {
    setItems(items.filter(item => item.id !== id))
  }
  return loading
    ? <Loader />
    : (
      <div>
        <section>
          {items.map(item => <Post key={item.id} settings={postProps} {...item} handleRemove={handleRemove} />)}
        </section>
        {nextPage && <button className='secondary' onClick={handleNext}>Load more</button>}
      </div>
      )
}
