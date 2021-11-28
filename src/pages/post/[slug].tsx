import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Head from 'next/head';

import { GetStaticPaths, GetStaticProps } from 'next';
import { RichText } from 'prismic-dom';
import { AiOutlineCalendar } from 'react-icons/ai';
import { FiClock, FiUser } from 'react-icons/fi';

import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter()
  const { first_publication_date, data } = post;

  const words = data.content.reduce((total, content) => {
    total += content.heading.split(' ').length;

    const words = content.body.map(item => item.text.split(' ').length);
    words.map(word => (total += word));

    return total;
  }, 0);
  const minutes = Math.ceil(words / 200);

  if (router.isFallback) {
    return <div>Carregando...</div>
  }

  return (
    <>
      <Head>
        <title>{`${data.title} | spacetraveling`}</title>
      </Head>

      <img 
        src={data.banner.url} 
        alt='Banner' 
        className={styles.banner} 
      />

      <main className={commonStyles.container}>
        <div className={styles.postHeader}>
          <h1>{data.title}</h1>
          <ul>
            <li>
              <AiOutlineCalendar size={20} />
              {format(
                new Date(first_publication_date),
                'dd MMM yyyy',
                {
                  locale: ptBR
                }
              )}
            </li>
            <li>
              <FiUser size={20} />
              {data.author}
            </li>
            <li>
              <FiClock size={20} />
              {minutes} min
            </li>
          </ul>
        </div>

        {data.content.map(content => (
          <article 
            key={content.heading}
            className={styles.post} 
          >
            <h2>{content.heading}</h2>
            <div 
              dangerouslySetInnerHTML={{ __html: RichText.asHtml(content.body) }}>
            </div>
          </article>
        ))}
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid
      }
    }
  });

  return {
    paths,
    fallback: true
  }
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body]
        }
      })
    }
  }

  return {
    props: {
      post
    },
    revalidate: 60 * 30, // 30 minutes
  }
};
