import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMarkerDto {
  @IsString()
  @IsNotEmpty()
  label: string;
}
