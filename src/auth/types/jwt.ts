export interface JwtPayload {
  sub: string;
  username: string;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
}
