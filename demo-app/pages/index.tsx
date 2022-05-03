import type { NextPage } from 'next'
import Head from 'next/head'
import { useState } from 'react'
import styles from '../styles/Home.module.css'

const Home: NextPage = () => {
  const [count, setCount] = useState(0)
  return (
    <div className={styles.container}>
      <Head>
        <title>K3s Demo App</title>
      </Head>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Hello from <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">k3s</a>!
        </h1>
        <h3 className={styles.code}>This button has been clicked {count} times</h3>
        <p onClick={() => setCount(count+1)} className={styles.card}>Don&apos;t click this button!</p>
      </main>
    </div>
  )
}

export default Home
