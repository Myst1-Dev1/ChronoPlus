import { z } from 'zod';

export const taskGqlSchema = `
  type Task {
    id: ID!
    name: String!
    description: String
    scheduledDate: String!
    taskConcluded: Boolean!
    userId: ID!
    createdAt: String!
    updatedAt: String!
  }

  input CreateTaskInput {
    name: String!
    description: String
    scheduledDate: String!
  }

  input EditTaskInput {
    name: String
    description: String
    scheduledDate: String
    taskConcluded: Boolean
  }

  type Query {
    getAllTasks: [Task!]!
    getTaskById(id: ID!): Task
  }

  type Mutation {
    createTask(input: CreateTaskInput!): Task!
    editTask(id: ID!, input: EditTaskInput!): Task!
    deleteTask(id: ID!): Boolean!
    markAsComplete(id: ID!): Task!
    maskAsComplete(id: ID!): Task!
  }
`;

export const createTaskSchema = z.object({
  name: z.string().trim().min(1, 'O título/nome da tarefa é obrigatório.'),
  description: z.string().trim().optional().nullable(),
  scheduledDate: z.string().datetime({ message: 'scheduledDate deve ser uma data válida no formato ISO 8601.' })
});

export const editTaskSchema = z.object({
  name: z.string().trim().min(1, 'O título/nome da tarefa não pode ser vazio.').optional(),
  description: z.string().trim().optional().nullable(),
  scheduledDate: z.string().datetime({ message: 'scheduledDate deve ser uma data válida no formato ISO 8601.' }).optional(),
  taskConcluded: z.boolean().optional()
});

export type CreateTaskDTO = z.infer<typeof createTaskSchema>;
export type EditTaskDTO = z.infer<typeof editTaskSchema>;
