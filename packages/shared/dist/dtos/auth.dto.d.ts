export interface LoginDto {
    email: string;
    password: string;
}
export interface RegisterDto {
    email: string;
    password: string;
    name: string;
}
export interface AuthResponseDto {
    accessToken: string;
    user: {
        id: string;
        email: string;
        name: string;
    };
}
//# sourceMappingURL=auth.dto.d.ts.map