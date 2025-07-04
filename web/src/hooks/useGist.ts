import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function useGist() {
  const [gist, setGist] = useState<String | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const shareId = query.get("share_id");
    if (shareId) setGist(shareId);
  }, []);

  const query = useQuery({
    queryKey: ["github-gist", gist],
    queryFn: () => {
      return fetch(`https://api.github.com/gists/${gist}`).then((res) =>
        res.json()
      );
    },

    // We always expect 1 source element, being the first element.
    select: (data) => {
      return Object.entries(data.files).map(
        ([_, file]: [string, any]) => (file as any).content
      )[0];
    },
    // aggressive caching.
    enabled: !!gist,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!gist || query.isLoading || query.data) return;

    toast.error("The specified gist was not found");
  }, [gist, query.isLoading, query.data]);

  return {
    query,
    hasShareParam: !!gist,
  };
}
