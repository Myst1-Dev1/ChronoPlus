import { z } from 'zod';

export const reminderGqlSchema = `
  type Reminder {
    id: ID!
    reminderName: String!
    reminderDescription: String
    reminderTime: String!
    reminderDate: String!
    reminderRepeat: Boolean!
    reminderNotify: String!
    latitude: Float
    longitude: Float
    userId: ID!
    createdAt: String!
    updatedAt: String!
  }

  input CreateReminderInput {
    reminderName: String!
    reminderDescription: String
    reminderTime: String!
    reminderDate: String!
    reminderRepeat: Boolean
    reminderNotify: String!
    latitude: Float
    longitude: Float
  }

  input EditReminderInput {
    reminderName: String
    reminderDescription: String
    reminderTime: String
    reminderDate: String
    reminderRepeat: Boolean
    reminderNotify: String
    latitude: Float
    longitude: Float
  }

  extend type Query {
    getAllReminders: [Reminder!]!
    getReminderById(id: ID!): Reminder
  }

  extend type Mutation {
    createReminder(input: CreateReminderInput!): Reminder!
    editReminder(id: ID!, input: EditReminderInput!): Reminder!
    deleteReminder(id: ID!): Boolean!
  }
`;

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const createReminderSchema = z.object({
  reminderName: z.string().trim().min(1, 'O nome do lembrete é obrigatório.'),
  reminderDescription: z.string().trim().optional().nullable(),
  reminderTime: z.string().regex(timeRegex, 'reminderTime deve estar no formato HH:mm (ex: 14:30).'),
  reminderDate: z.string().datetime({ message: 'reminderDate deve ser uma data válida no formato ISO 8601.' }),
  reminderRepeat: z.boolean().optional().default(false),
  reminderNotify: z.string().trim().min(1, 'A regra de notificação (reminderNotify) é obrigatória.'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable()
});

export const editReminderSchema = z.object({
  reminderName: z.string().trim().min(1, 'O nome do lembrete não pode ser vazio.').optional(),
  reminderDescription: z.string().trim().optional().nullable(),
  reminderTime: z.string().regex(timeRegex, 'reminderTime deve estar no formato HH:mm (ex: 14:30).').optional(),
  reminderDate: z.string().datetime({ message: 'reminderDate deve ser uma data válida no formato ISO 8601.' }).optional(),
  reminderRepeat: z.boolean().optional(),
  reminderNotify: z.string().trim().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable()
});

export type CreateReminderDTO = z.infer<typeof createReminderSchema>;
export type EditReminderDTO = z.infer<typeof editReminderSchema>;
