"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/actions/auth";

interface GoogleLoginButtonProps {
  disabled?: boolean;
}

export function GoogleLoginButton({
  disabled = false,
}: GoogleLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    // signInWithGoogle은 항상 redirect()로 종료되므로 에러 핸들링 불필요
    // setIsLoading(false)는 리다이렉트 후 도달하지 않음
    await signInWithGoogle();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 구분선 */}
      <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">
          또는
        </span>
      </div>

      {/* Google 로그인 버튼 */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={disabled || isLoading}
        onClick={handleClick}
      >
        {isLoading ? "Redirecting..." : "구글로 계속하기"}
      </Button>
    </div>
  );
}
