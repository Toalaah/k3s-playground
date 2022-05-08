import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { useEffect, useRef, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import type React from 'react'

import { createReactQueryHooks } from '@trpc/react'
import type { AppRouter } from '../backend/router'
export const trpc = createReactQueryHooks<AppRouter>()

const Home: NextPage = () => {
  var id = 0
  const ok = useRef(false)
  const [value, setValue] = useState(0)
  const mutation = trpc.useMutation(['set-count'])

  const query = trpc.useQuery(['get-count'], {
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: false,
    onSuccess: (data) => {
      ok.current = true
      setValue(data.count?.count ?? 0)
    },
    onError: () => {
      toast.warn(
        'No database connection could be established, falling back to local state.',
        {
          autoClose: 3000,
          theme: 'dark',
        },
      )
    },
  })

  useEffect(() => {
    query.refetch()
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
          <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">K3s</a>!
        </h1>
        <h3 className={styles.code}>
          This button has been clicked {value} times
        </h3>
        <p
          onClick={() => {
            setValue(value + 1)
            ok.current && mutation.mutate({ id: id, count: value + 1 })
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
