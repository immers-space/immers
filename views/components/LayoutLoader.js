import React from 'react'
import Layout from './Layout'
import Loader from './Loader'

export default function LayoutLoader ({ contentTitle = 'Loading...' }) {
  return (
    <Layout contentTitle={contentTitle}>
      <Loader />
    </Layout>
  )
}
