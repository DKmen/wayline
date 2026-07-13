import { execFileSync } from 'node:child_process';
import process from 'node:process';

/** Reads the repository branch, commit, and cleanliness without mutating Git state. */
export function getRepositorySnapshot(repositoryRoot) {
  const environment = { ...process.env };
  delete environment.GIT_DIR;
  delete environment.GIT_WORK_TREE;
  delete environment.GIT_INDEX_FILE;
  delete environment.GIT_PREFIX;
  const git = (...arguments_) =>
    execFileSync('git', arguments_, {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: environment,
    }).trim();
  const porcelain = git('status', '--short');

  return {
    branch: git('branch', '--show-current') || 'detached',
    head: git('rev-parse', '--short', 'HEAD'),
    status: porcelain ? 'dirty' : 'clean',
  };
}
