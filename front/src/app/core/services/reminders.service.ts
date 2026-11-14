import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';

export interface Reminder {
  id: string;
  reminderName: string;
  reminderDescription?: string | null;
  reminderTime: string;
  reminderDate: string;
  reminderRepeat: boolean;
  reminderNotify: string;
  concluded?: boolean;
}

export interface CreateReminderInput {
  reminderName: string;
  reminderDescription?: string | null;
  reminderTime: string;
  reminderDate: string;
  reminderRepeat?: boolean;
  reminderNotify: string;
  latitude?: number | null;
  longitude?: number | null;
}

export const GET_ALL_REMINDERS_QUERY = gql`
  query GetAllReminders {
    getAllReminders {
      id
      reminderName
      reminderDescription
      reminderTime
      reminderDate
      reminderRepeat
      reminderNotify
    }
  }
`;

export const CREATE_REMINDER_MUTATION = gql`
  mutation CreateReminder($input: CreateReminderInput!) {
    createReminder(input: $input) {
      id
      reminderName
      reminderDescription
      reminderTime
      reminderDate
      reminderRepeat
      reminderNotify
      createdAt
    }
  }
`;

interface GetAllRemindersResponse {
  getAllReminders: Reminder[];
}

interface CreateReminderResponse {
  createReminder: Reminder;
}

@Injectable({
  providedIn: 'root'
})
export class RemindersService {
  private readonly apollo = inject(Apollo);

  getAllReminders(): Observable<Reminder[]> {
    return this.apollo
      .watchQuery<GetAllRemindersResponse>({
        query: GET_ALL_REMINDERS_QUERY,
        fetchPolicy: 'cache-and-network'
      })
      .valueChanges.pipe(
        map((result) => result.data?.getAllReminders ?? [])
      );
  }

  fetchReminders(): Observable<Reminder[]> {
    return this.apollo
      .query<GetAllRemindersResponse>({
        query: GET_ALL_REMINDERS_QUERY,
        fetchPolicy: 'network-only'
      })
      .pipe(
        map((result) => result.data?.getAllReminders ?? [])
      );
  }

  createReminder(input: CreateReminderInput): Observable<Reminder> {
    return this.apollo
      .mutate<CreateReminderResponse>({
        mutation: CREATE_REMINDER_MUTATION,
        variables: { input },
        refetchQueries: [{ query: GET_ALL_REMINDERS_QUERY }]
      })
      .pipe(
        map((result) => {
          if (!result.data?.createReminder) {
            throw new Error('Não foi possível criar o lembrete.');
          }
          return result.data.createReminder;
        })
      );
  }
}
