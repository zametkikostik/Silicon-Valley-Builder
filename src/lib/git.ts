/**
 * Git integrations: GitHub / GitLab / Bitbucket
 * Uses OAuth tokens. Clients can connect repo and push generated code.
 */

export type GitProvider = "github" | "gitlab" | "bitbucket";

export async function pushToRepo(opts: {
  provider: GitProvider;
  accessToken: string;
  repo: string;
  branch?: string;
  files: Record<string, string>;
  message?: string;
  projectId?: string | number;
}) {
  const {
    provider,
    accessToken,
    repo,
    branch = "main",
    files,
    message = "Update from Silicon Valley Builder",
  } = opts;

  if (provider === "github") return pushGitHub(accessToken, repo, branch, files, message);
  if (provider === "gitlab") return pushGitLab(accessToken, opts.projectId || repo, branch, files, message);
  if (provider === "bitbucket") return pushBitbucket(accessToken, repo, branch, files, message);
  throw new Error(`Unknown provider: ${provider}`);
}

async function pushGitHub(token: string, repo: string, branch: string, files: Record<string, string>, message: string) {
  const results: { path: string; ok: boolean; status?: number }[] = [];
  for (const [path, content] of Object.entries(files)) {
    const url = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`;
    let sha: string | undefined;
    try {
      const existing = await fetch(`${url}?ref=${branch}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
      if (existing.ok) {
        const data = await existing.json();
        sha = data.sha;
      }
    } catch {}
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        branch,
        ...(sha ? { sha } : {}),
      }),
    });
    results.push({ path, ok: res.ok, status: res.status });
    if (!res.ok) console.error("GitHub push failed", path, await res.text());
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length) throw new Error(`GitHub push failed for: ${failed.map((f) => f.path).join(", ")}`);
  return { ok: true, results };
}

async function pushGitLab(token: string, project: string | number, branch: string, files: Record<string, string>, message: string) {
  const projectId = typeof project === "number" ? project : encodeURIComponent(project);
  const base = `https://gitlab.com/api/v4/projects/${projectId}`;
  const actions = Object.entries(files).map(([file_path, content]) => ({
    action: "create" as const,
    file_path,
    content,
  }));
  for (const action of actions) {
    try {
      const check = await fetch(
        `${base}/repository/files/${encodeURIComponent(action.file_path)}?ref=${branch}`,
        { headers: { "PRIVATE-TOKEN": token } }
      );
      if (check.ok) (action as any).action = "update";
    } catch {}
  }
  const res = await fetch(`${base}/repository/commits`, {
    method: "POST",
    headers: { "PRIVATE-TOKEN": token, "Content-Type": "application/json" },
    body: JSON.stringify({ branch, commit_message: message, actions }),
  });
  if (!res.ok) throw new Error(`GitLab push failed: ${res.status} ${await res.text()}`);
  return { ok: true, commit: await res.json() };
}

async function pushBitbucket(token: string, repo: string, branch: string, files: Record<string, string>, message: string) {
  const [workspace, repoSlug] = repo.split("/");
  if (!workspace || !repoSlug) throw new Error("Bitbucket repo must be workspace/repo_slug");
  const base = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}`;
  const results: { path: string; ok: boolean }[] = [];
  for (const [path, content] of Object.entries(files)) {
    const form = new FormData();
    form.append(path, new Blob([content], { type: "text/plain" }));
    form.append("message", message);
    form.append("branch", branch);
    const res = await fetch(`${base}/src`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    results.push({ path, ok: res.ok || res.status === 201 });
    if (!res.ok && res.status !== 201) console.error("Bitbucket push failed", path, await res.text());
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length) throw new Error(`Bitbucket push failed for: ${failed.map((f) => f.path).join(", ")}`);
  return { ok: true, results };
}

export async function listRepos(
  provider: GitProvider,
  accessToken: string
): Promise<{ id: string; name: string; full_name: string; html_url: string }[]> {
  if (provider === "github") {
    const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error("GitHub list repos failed");
    const data = await res.json();
    return data.map((r: any) => ({
      id: String(r.id),
      name: r.name,
      full_name: r.full_name,
      html_url: r.html_url,
    }));
  }
  if (provider === "gitlab") {
    const res = await fetch("https://gitlab.com/api/v4/projects?membership=true&per_page=100&order_by=updated_at", {
      headers: { "PRIVATE-TOKEN": accessToken },
    });
    if (!res.ok) throw new Error("GitLab list repos failed");
    const data = await res.json();
    return data.map((r: any) => ({
      id: String(r.id),
      name: r.name,
      full_name: r.path_with_namespace,
      html_url: r.web_url,
    }));
  }
  if (provider === "bitbucket") {
    const res = await fetch("https://api.bitbucket.org/2.0/repositories?role=member&pagelen=50", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error("Bitbucket list repos failed");
    const data = await res.json();
    return (data.values || []).map((r: any) => ({
      id: r.uuid,
      name: r.name,
      full_name: r.full_name,
      html_url: r.links?.html?.href || "",
    }));
  }
  return [];
}
