import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

import { Count, PrismaClient } from '@prisma/client'
import { useEffect, useState } from 'react'
const prisma = new PrismaClient()

import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

interface propType {
  count: Count | null
  ok: boolean
}

export const getServerSideProps = async () => {
  try {
    const count = await prisma.count.findFirst()
    return { props: { count: count, ok: true } }
  } catch (e) {
    return { props: { count: null, ok: false } }
  }
}

const Home: NextPage<propType> = (props) => {
  const { count, ok } = props
  const [val, setVal] = useState(count?.count ?? 0)
  useEffect(() => {
    if (!ok) {
      toast.warn(
        'No database connection could be established, falling back to local state.',
        {
          autoClose: 3000,
          theme: 'dark',
        },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className={styles.container}>
      <Head>
        <title>K3s Demo App</title>
      </Head>
      <main className={styles.main}>
        <ToastContainer />
        <h1 className={styles.title}>
          Hello from{' '}
          <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">k3s</a>!
        </h1>
        <h3 className={styles.code}>
          This button has been clicked {val} times
        </h3>
        <p
          onClick={() => {
            setVal(val + 1)
            console.log('clicked')
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
