import { ApplicationConfig, inject } from '@angular/core';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { ApolloClientOptions, ApolloLink, InMemoryCache } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { environment } from '../../../environments/environment';

export const AUTH_TOKEN_KEY = 'chronoplus_access_token';

export function createApollo(): ApolloClientOptions<unknown> {
  const httpLink = inject(HttpLink);

  // Link HTTP para comunicação com o backend GraphQL
  const http = httpLink.create({
    uri: environment.graphqlUrl
  });

  // Link de contexto para injetar token JWT Bearer automaticamente
  const authLink = setContext((_operation, { headers }) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return {
      headers: {
        ...headers,
        ...(token ? { authorization: `Bearer ${token}` } : {})
      }
    };
  });

  // Link de erro para captura centralizada de falhas de autenticação (401 / UNAUTHENTICATED)
  const errorLink = onError(({ graphQLErrors, networkError }) => {
    let isUnauthorized = false;

    if (graphQLErrors) {
      for (const err of graphQLErrors) {
        const ext = err.extensions as Record<string, unknown> | undefined;
        const code = ext?.['code'];
        const statusCode = ext?.['statusCode'];
        if (
          code === 'UNAUTHENTICATED' ||
          statusCode === 401 ||
          err.message?.toLowerCase().includes('não autorizado')
        ) {
          isUnauthorized = true;
          break;
        }
      }
    }

    if (networkError && 'statusCode' in networkError && networkError.statusCode === 401) {
      isUnauthorized = true;
    }

    if (isUnauthorized) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem('chronoplus_refresh_token');
      localStorage.removeItem('chronoplus_user_info');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/cadastro')) {
        window.location.href = '/login';
      }
    }
  });

  return {
    link: ApolloLink.from([authLink, errorLink, http]),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            getAllTasks: {
              merge(_existing, incoming) {
                return incoming;
              }
            },
            getAllReminders: {
              merge(_existing, incoming) {
                return incoming;
              }
            }
          }
        }
      }
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all'
      },
      query: {
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
      },
      mutate: {
        errorPolicy: 'all'
      }
    }
  };
}

export const graphqlProviders: ApplicationConfig['providers'] = [
  provideApollo(createApollo)
];
