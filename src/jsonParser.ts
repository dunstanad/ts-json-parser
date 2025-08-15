// Complete JSON Parser - TypeScript Implementation
// Fully compliant with RFC 7159 JSON specification

export type JSONValue = 
  | string
  | number
  | boolean
  | null
  | JSONObject
  | JSONArray;

export interface JSONObject {
  [key: string]: JSONValue;
}

export interface JSONArray extends Array<JSONValue> {}

export class JSONParseError extends Error {
  public position: number;
  
  constructor(message: string, position: number) {
    super(`${message} at position ${position}`);
    this.name = 'JSONParseError';
    this.position = position;
  }
}

export class JSONParser {
  private pos: number = 0;
  private input: string;
  private length: number;

  constructor(input: string) {
    this.input = input;
    this.length = input.length;
  }

  /**
   * Parse JSON string and return the parsed value
   */
  parse(): JSONValue {
    this.pos = 0;
    this.skipWhitespace();
    
    if (this.pos >= this.length) {
      throw new JSONParseError('Unexpected end of JSON input', this.pos);
    }
    
    const value = this.parseValue();
    this.skipWhitespace();
    
    if (this.pos < this.length) {
      throw new JSONParseError(`Unexpected token '${this.input[this.pos]}'`, this.pos);
    }
    
    return value;
  }

  private parseValue(): JSONValue {
    this.skipWhitespace();
    
    if (this.pos >= this.length) {
      throw new JSONParseError('Unexpected end of JSON input', this.pos);
    }
    
    const char = this.input[this.pos];
    
    switch (char) {
      case '{': return this.parseObject();
      case '[': return this.parseArray();
      case '"': return this.parseString();
      case 't': return this.parseTrue();
      case 'f': return this.parseFalse();
      case 'n': return this.parseNull();
      case '-':
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        return this.parseNumber();
      default:
        throw new JSONParseError(`Unexpected token '${char}'`, this.pos);
    }
  }

  private parseObject(): JSONObject {
    const obj: JSONObject = {};
    this.pos++; // Skip '{'
    this.skipWhitespace();

    // Handle empty object
    if (this.pos < this.length && this.input[this.pos] === '}') {
      this.pos++;
      return obj;
    }

    let first = true;
    while (this.pos < this.length) {
      if (!first) {
        this.skipWhitespace();
        if (this.pos >= this.length) {
          throw new JSONParseError('Unexpected end of JSON input', this.pos);
        }
        if (this.input[this.pos] === '}') {
          this.pos++;
          return obj;
        }
        if (this.input[this.pos] !== ',') {
          throw new JSONParseError(`Expected ',' or '}' but got '${this.input[this.pos]}'`, this.pos);
        }
        this.pos++; // Skip ','
      }
      first = false;

      this.skipWhitespace();
      
      // Parse key (must be string)
      if (this.pos >= this.length || this.input[this.pos] !== '"') {
        throw new JSONParseError('Expected string key', this.pos);
      }
      
      const key = this.parseString();
      this.skipWhitespace();
      
      // Expect colon
      if (this.pos >= this.length || this.input[this.pos] !== ':') {
        throw new JSONParseError(`Expected ':' after key`, this.pos);
      }
      this.pos++; // Skip ':'
      
      // Parse value
      const value = this.parseValue();
      obj[key] = value;
    }

    throw new JSONParseError('Unterminated object', this.pos);
  }

  private parseArray(): JSONArray {
    const arr: JSONArray = [];
    this.pos++; // Skip '['
    this.skipWhitespace();

    // Handle empty array
    if (this.pos < this.length && this.input[this.pos] === ']') {
      this.pos++;
      return arr;
    }

    let first = true;
    while (this.pos < this.length) {
      if (!first) {
        this.skipWhitespace();
        if (this.pos >= this.length) {
          throw new JSONParseError('Unexpected end of JSON input', this.pos);
        }
        if (this.input[this.pos] === ']') {
          this.pos++;
          return arr;
        }
        if (this.input[this.pos] !== ',') {
          throw new JSONParseError(`Expected ',' or ']' but got '${this.input[this.pos]}'`, this.pos);
        }
        this.pos++; // Skip ','
      }
      first = false;

      const value = this.parseValue();
      arr.push(value);
    }

    throw new JSONParseError('Unterminated array', this.pos);
  }

  private parseString(): string {
    let result = '';
    this.pos++; // Skip opening '"'
    
    while (this.pos < this.length) {
      const char = this.input[this.pos];
      
      if (char === '"') {
        this.pos++; // Skip closing '"'
        return result;
      }
      
      if (char === '\\') {
        this.pos++;
        if (this.pos >= this.length) {
          throw new JSONParseError('Unterminated string escape sequence', this.pos);
        }
        
        const escapeChar = this.input[this.pos];
        switch (escapeChar) {
          case '"':
            result += '"';
            break;
          case '\\':
            result += '\\';
            break;
          case '/':
            result += '/';
            break;
          case 'b':
            result += '\b';
            break;
          case 'f':
            result += '\f';
            break;
          case 'n':
            result += '\n';
            break;
          case 'r':
            result += '\r';
            break;
          case 't':
            result += '\t';
            break;
          case 'u':
            // Unicode escape sequence \uXXXX
            if (this.pos + 4 >= this.length) {
              throw new JSONParseError('Incomplete unicode escape sequence', this.pos);
            }
            const hexCode = this.input.slice(this.pos + 1, this.pos + 5);
            if (!/^[0-9a-fA-F]{4}$/.test(hexCode)) {
              throw new JSONParseError(`Invalid unicode escape sequence \\u${hexCode}`, this.pos);
            }
            result += String.fromCharCode(parseInt(hexCode, 16));
            this.pos += 4; // Skip the 4 hex digits
            break;
          default:
            throw new JSONParseError(`Invalid escape sequence \\${escapeChar}`, this.pos);
        }
      } else if (char < ' ' && char !== '\t') {
        // Control characters (except tab) must be escaped
        throw new JSONParseError(`Unescaped control character (code ${char.charCodeAt(0)})`, this.pos);
      } else {
        result += char;
      }
      
      this.pos++;
    }
    
    throw new JSONParseError('Unterminated string', this.pos);
  }

  private parseNumber(): number {
    const start = this.pos;
    
    // Optional negative sign
    if (this.input[this.pos] === '-') {
      this.pos++;
      if (this.pos >= this.length || !this.isDigit(this.input[this.pos])) {
        throw new JSONParseError('Invalid number format', this.pos);
      }
    }
    
    // Integer part
    if (this.input[this.pos] === '0') {
      this.pos++;
      // Leading zeros not allowed (except for just "0")
      if (this.pos < this.length && this.isDigit(this.input[this.pos])) {
        throw new JSONParseError('Invalid number: leading zeros not allowed', this.pos);
      }
    } else if (this.isDigit(this.input[this.pos])) {
      while (this.pos < this.length && this.isDigit(this.input[this.pos])) {
        this.pos++;
      }
    } else {
      throw new JSONParseError('Invalid number format', this.pos);
    }
    
    // Decimal part
    if (this.pos < this.length && this.input[this.pos] === '.') {
      this.pos++;
      if (this.pos >= this.length || !this.isDigit(this.input[this.pos])) {
        throw new JSONParseError('Invalid number: decimal point must be followed by digits', this.pos);
      }
      while (this.pos < this.length && this.isDigit(this.input[this.pos])) {
        this.pos++;
      }
    }
    
    // Exponent part
    if (this.pos < this.length && (this.input[this.pos] === 'e' || this.input[this.pos] === 'E')) {
      this.pos++;
      if (this.pos < this.length && (this.input[this.pos] === '+' || this.input[this.pos] === '-')) {
        this.pos++;
      }
      if (this.pos >= this.length || !this.isDigit(this.input[this.pos])) {
        throw new JSONParseError('Invalid number: exponent must contain digits', this.pos);
      }
      while (this.pos < this.length && this.isDigit(this.input[this.pos])) {
        this.pos++;
      }
    }
    
    const numberStr = this.input.slice(start, this.pos);
    const number = Number(numberStr);
    
    if (!Number.isFinite(number)) {
      throw new JSONParseError(`Invalid number: ${numberStr}`, start);
    }
    
    return number;
  }

  private parseTrue(): boolean {
    if (this.input.slice(this.pos, this.pos + 4) === 'true') {
      this.pos += 4;
      return true;
    }
    throw new JSONParseError(`Expected 'true'`, this.pos);
  }

  private parseFalse(): boolean {
    if (this.input.slice(this.pos, this.pos + 5) === 'false') {
      this.pos += 5;
      return false;
    }
    throw new JSONParseError(`Expected 'false'`, this.pos);
  }

  private parseNull(): null {
    if (this.input.slice(this.pos, this.pos + 4) === 'null') {
      this.pos += 4;
      return null;
    }
    throw new JSONParseError(`Expected 'null'`, this.pos);
  }

  private skipWhitespace(): void {
    while (this.pos < this.length && this.isWhitespace(this.input[this.pos])) {
      this.pos++;
    }
  }

  private isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\n' || char === '\r';
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }
}

// Utility function for easy parsing
export function parseJSON(input: string): JSONValue {
  const parser = new JSONParser(input);
  return parser.parse();
}
