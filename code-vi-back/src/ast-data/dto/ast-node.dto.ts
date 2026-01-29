export class AstNodeRange {
  start: { line: number; col: number };
  end: { line: number; col: number };
}

export class AstNodeDto {
  type: string;
  name?: string;
  text?: string;
  range: AstNodeRange;
  children?: AstNodeDto[];
}
