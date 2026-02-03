import { IsNotEmpty } from 'class-validator';

export class AppDbConfig {
  @IsNotEmpty()
  url: string;
}
