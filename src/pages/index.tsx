import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import { getPrismicClient } from '../services/prismic';

import { FiUser } from 'react-icons/fi';
import { AiOutlineCalendar } from 'react-icons/ai';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import styles from './home.module.scss';
import commonStyles from '../styles/common.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

export default function Home({ postsPagination, preview }: HomeProps) {
  const {next_page, results} = postsPagination;

  const [posts, setPosts] = useState<Post[]>(results);
  const [nextPage, setNextPage] = useState<string>(next_page);

  async function handleMorePosts() {
    const data = await fetch(nextPage).then(response => 
      response.json()
    );

    setNextPage(data.next_page);
    setPosts([...posts, ...data.results]);
  }
  
  return (
    <>
      <Head>
        <title>Home | spacetraveling</title>
      </Head>

      <main className={commonStyles.container}>
        <div className={styles.posts}>
          {posts.map(post => (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a className={styles.post}>
                <strong>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>
                <ul>
                  <li>
                    <AiOutlineCalendar size={20} />
                    {format(
                      new Date(post.first_publication_date),
                      'dd MMM yyyy',
                      {
                        locale: ptBR
                      }
                    )}
                  </li>
                  <li>
                    <FiUser size={20} />
                    {post.data.author}
                  </li>
                </ul>
              </a>
            </Link>
          ))}
        
          {nextPage && (
            <button 
              className={styles.loadMore}
              onClick={handleMorePosts}
            >
              Carregar mais posts
            </button>
          )}
        </div>

        {preview && (
          <aside className={commonStyles.preview}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({ preview = false }) => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    pageSize: 1
  });

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author
      }
    }
  });

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results: posts
      },
      preview
    },
    revalidate: 60 * 60 * 24, // 24 hours
  }
};
