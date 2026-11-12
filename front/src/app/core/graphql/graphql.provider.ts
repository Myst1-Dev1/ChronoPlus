import { ApplicationConfig, inject } from '@angular/core';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { ApolloClientOptions, ApolloLink, InMemoryCache } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { environment } from '../../../environments/environment';

export const AUTH_TOKEN_KEY = 'chronoplus_access_token';

export function createApollo(): ApolloClientOptions<unknown> {
  const httpLink = inject(HttpLink);

  // Link HTTP para comunicação com o backend GraphQL
  const http = httpLink.create({
    uri: environment.graphqlUrl
  });

  // Link de contexto para injetar token JWT Bearer automaticamente
  const authLink = setContext((operation, { headers }) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : ''
      }
    };
  });

  return {
    link: ApolloLink.from([authLink, http]),
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
