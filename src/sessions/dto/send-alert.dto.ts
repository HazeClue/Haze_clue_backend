import { IsNotEmpty, IsString } from 'class-validator';

export class SendAlertDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
