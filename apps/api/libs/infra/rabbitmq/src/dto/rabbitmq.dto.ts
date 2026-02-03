import { IsNotEmpty } from 'class-validator';
import * as Rabbitmq from 'amqplib';
export const RABBITMQ_CONNECTION = Symbol('RABBITMQ:AUTH');

export class AppRabbitConfig {
  @IsNotEmpty()
  url: string;
}

export interface RabbitmqConnection {
  connection: Rabbitmq.Connection;
  close(): Promise<void>;
}
