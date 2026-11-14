import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';

export interface Task {
  id: string;
  name: string;
  description?: string | null;
  scheduledDate: string;
  taskConcluded: boolean;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskInput {
  name: string;
  description?: string | null;
  scheduledDate: string;
}

export interface EditTaskInput {
  name?: string;
  description?: string | null;
  scheduledDate?: string;
  taskConcluded?: boolean;
}

export const GET_ALL_TASKS_QUERY = gql`
  query GetAllTasks {
    getAllTasks {
      id
      name
      description
      scheduledDate
      taskConcluded
      userId
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_TASK_MUTATION = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      id
      name
      description
      scheduledDate
      taskConcluded
      userId
      createdAt
      updatedAt
    }
  }
`;

export const EDIT_TASK_MUTATION = gql`
  mutation EditTask($id: ID!, $input: EditTaskInput!) {
    editTask(id: $id, input: $input) {
      id
      name
      description
      scheduledDate
      taskConcluded
      userId
      createdAt
      updatedAt
    }
  }
`;

export const MARK_AS_COMPLETE_MUTATION = gql`
  mutation MarkAsComplete($id: ID!) {
    markAsComplete(id: $id) {
      id
      name
      description
      scheduledDate
      taskConcluded
      userId
      createdAt
      updatedAt
    }
  }
`;

interface GetAllTasksResponse {
  getAllTasks: Task[];
}

interface CreateTaskResponse {
  createTask: Task;
}

interface EditTaskResponse {
  editTask: Task;
}

interface MarkAsCompleteResponse {
  markAsComplete: Task;
}

@Injectable({
  providedIn: 'root'
})
export class TasksService {
  private readonly apollo = inject(Apollo);

  getAllTasks(): Observable<Task[]> {
    return this.apollo
      .watchQuery<GetAllTasksResponse>({
        query: GET_ALL_TASKS_QUERY,
        fetchPolicy: 'cache-and-network'
      })
      .valueChanges.pipe(
        map((result) => result.data?.getAllTasks ?? [])
      );
  }

  createTask(input: CreateTaskInput): Observable<Task> {
    return this.apollo
      .mutate<CreateTaskResponse>({
        mutation: CREATE_TASK_MUTATION,
        variables: { input },
        refetchQueries: [{ query: GET_ALL_TASKS_QUERY }]
      })
      .pipe(
        map((result) => {
          if (!result.data?.createTask) {
            throw new Error('Falha ao criar tarefa no servidor.');
          }
          return result.data.createTask;
        })
      );
  }

  editTask(id: string, input: EditTaskInput): Observable<Task> {
    return this.apollo
      .mutate<EditTaskResponse>({
        mutation: EDIT_TASK_MUTATION,
        variables: { id, input },
        refetchQueries: [{ query: GET_ALL_TASKS_QUERY }]
      })
      .pipe(
        map((result) => {
          if (!result.data?.editTask) {
            throw new Error('Falha ao atualizar tarefa.');
          }
          return result.data.editTask;
        })
      );
  }

  markAsComplete(id: string): Observable<Task> {
    return this.apollo
      .mutate<MarkAsCompleteResponse>({
        mutation: MARK_AS_COMPLETE_MUTATION,
        variables: { id },
        refetchQueries: [{ query: GET_ALL_TASKS_QUERY }]
      })
      .pipe(
        map((result) => {
          if (!result.data?.markAsComplete) {
            throw new Error('Falha ao concluir tarefa.');
          }
          return result.data.markAsComplete;
        })
      );
  }
}
