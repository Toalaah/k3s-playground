import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

import { Count, PrismaClient } from '@prisma/client'
import { useState } from 'react'
const prisma = new PrismaClient()

export const getServerSideProps = async () => {
  const count = await prisma.count.findFirst()
  return { props: { count } }
}

const Home: NextPage<{ count: Count | null }> = (props) => {
  const { count } = props
  const [val, setVal] = useState(count?.count ?? 0)
  return (
    <div className={styles.container}>
      <Head>
        <title>K3s Demo App</title>
      </Head>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Hello from{' '}
          <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">k3s</a>!
        </h1>
        <h3 className={styles.code}>
          This button has been clicked {val} times
        </h3>
        <p onClick={() => setVal(val + 1)} className={styles.card}>
          Don&apos;t click this button!
        </p>
      </main>
    </div>
  )
}

export default Home
