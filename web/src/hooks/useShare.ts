import { CacheKeys, Code, PlaygroundApiCache } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";

export function useShare({
  apiUrl,
  codeRequest,
}: {
  apiUrl: string;
  codeRequest: Code;
}) {
  const key = CacheKeys.share(codeRequest);

  return useMutation({
    mutationFn: async (codeRequest: Code) => {
      if (PlaygroundApiCache.has(key)) {
        return PlaygroundApiCache.get(key);
      }

      const res = await fetch(`${apiUrl}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(codeRequest),
      });

      if (!res.ok) throw new Error("Network error");
      const data = await res.json();

      PlaygroundApiCache.set(key, data);

      return data;
    },
    mutationKey: [key],
  });
}
