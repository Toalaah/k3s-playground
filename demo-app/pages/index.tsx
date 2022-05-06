import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import axios from 'axios'
import { Count, PrismaClient } from '@prisma/client'
import { useEffect, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const prisma = new PrismaClient()

interface propType {
  dbCount: Count | null
  ok: boolean
}

export const getServerSideProps = async () => {
  try {
    const count =
      (await prisma.count.findFirst()) ??
      await prisma.count.create({ data: { count: 0 } })
    return { props: { dbCount: count, ok: true } }
  } catch (e) {
    return { props: { dbCount: null, ok: false } }
  }
}
const checkDatabaseConnection = (ok: Boolean) => {
  if (!ok) {
    toast.warn(
      'No database connection could be established, falling back to local state.',
      {
        autoClose: 3000,
        theme: 'dark',
      },
    )
  }
}

const persistCount = (id: number, count: number) =>
  axios.post(`${process.env.NEXT_PUBLIC_API_BASE}/count`, {
    id: id,
    count: count,
  })

const Home: NextPage<propType> = (props) => {
  const { dbCount, ok } = props
  const [count, setCount] = useState(dbCount?.count ?? 0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => checkDatabaseConnection(ok), [])

  return (
    <div className={styles.container}>
      <Head>
        <title>K3s Demo App</title>
      </Head>
      <main className={styles.main}>
        <ToastContainer />
        <h1 className={styles.title}>
          Hello from{' '}
          <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">K3s</a>!
        </h1>
        <h3 className={styles.code}>
          This button has been clicked {count} times
        </h3>
        <p
          onClick={() => {
            setCount(count + 1)
            ok && persistCount(dbCount?.id ?? 0, count + 1)
          }}
          className={styles.card}
        >
          Don&apos;t click this button!
        </p>
      </main>
    </div>
  )
}

export default Home
