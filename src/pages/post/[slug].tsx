import Head from 'next/head';
import Link from 'next/link';
import { RichText } from 'prismic-dom';
import { useRouter } from 'next/router';
import Prismic from '@prismicio/client';

import Comments from '../../components/Comments';
import { GetStaticPaths, GetStaticProps } from 'next';
import { getPrismicClient } from '../../services/prismic';

import { FiClock, FiUser } from 'react-icons/fi';
import { AiOutlineCalendar } from 'react-icons/ai';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import styles from './styles.module.scss';
import commonStyles from '../../styles/common.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
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
  preview: boolean;
  navigation: {
    prev?: {
      uid: string;
      data: {
        title: string;
      }
    }[],
    next?: {
      uid: string;
      data: {
        title: string;
      }
    }[]
  };
}

export default function Post({ post, preview, navigation }: PostProps): JSX.Element {
  const router = useRouter()
  const {
    first_publication_date,
    last_publication_date,
    data
  } = post;

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
          {first_publication_date !== last_publication_date && (
            <span>
              * editado em {
                format(
                  new Date(last_publication_date),
                  'dd MMM yyyy',
                  {
                    locale: ptBR
                  }
                )
              },
              às {
                format(
                  new Date(last_publication_date),
                  'HH:mm',
                  {
                    locale: ptBR
                  }
                )
              }
            </span>
          )}
        </div>

        <div className={styles.content}>
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
        </div>

        <div className={styles.navigation}>
          <div className={styles.prev}>
            {navigation?.prev.length > 0 && (
              <>
                <span>{navigation.prev[0].data.title}</span>
                <Link href={`/post/${navigation.prev[0].uid}`}>
                  <a>Post anterior</a>
                </Link>
              </>
            )}
          </div>

          <div className={styles.next}>
            {navigation?.next.length > 0 && (
              <>
                <span>{navigation.next[0].data.title}</span>
                <Link href={`/post/${navigation.next[0].uid}`}>
                  <a>Próximo post</a>
                </Link>
              </>
            )}
          </div>
        </div>

        <Comments />

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

export const getStaticProps: GetStaticProps = async ({ 
  params,
  preview = false,
  previewData 
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref || null
  });

  const prev = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    pageSize: 1,
    after: response.id,
    orderings: '[document.last_publication_date]'
  });

  const next = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    pageSize: 1,
    after: response.id,
    orderings: '[document.last_publication_date desc]'
  });

  const post = {
    uid: response.uid,
    first_publication_date: 
      response.first_publication_date ?? '2000-01-18T00:00:00+0000',
    last_publication_date: 
      response.last_publication_date ?? '2000-01-18T12:00:00+0000',
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
      post,
      preview,
      navigation: {
        prev: prev.results,
        next: next.results
      },
    },
    revalidate: 60 * 30, // 30 minutes
  }
};
