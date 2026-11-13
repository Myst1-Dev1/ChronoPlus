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

interface GetAllRemindersResponse {
  getAllReminders: Reminder[];
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
}
