#compdef {{COMMAND_NAME}}

_gwt_run_complete() {
  command {{COMMAND_NAME}} __complete "$1" 2>/dev/null
}

_gwt_compadd_lines() {
  local kind=$1
  local -a values
  values=("${(@f)$(_gwt_run_complete "$kind")}")
  (( ${#values} )) || return 1
  compadd -- "${values[@]}"
}

_gwt_complete_new_branch() {
  _message 'new branch name'
}

_gwt_complete_refs() {
  _gwt_compadd_lines refs || _message 'git ref'
}

_gwt_complete_remote_branches() {
  _gwt_compadd_lines remote-branches || _message 'remote branch'
}

_gwt_complete_local_branches() {
  _gwt_compadd_lines local-branches || _message 'local branch'
}

_gwt_complete_removable_branches() {
  _gwt_compadd_lines removable-branches || _message 'local branch'
}

_gwt_cmd_init() {
  _arguments -C \
    '(-b --branch)'{-b,--branch}'[default branch name]:branch name:' \
    '1:repo url:' \
    '2:workspace directory:_files -/'
}

_gwt_cmd_new() {
  _arguments -C \
    '(-p --push)'{-p,--push}'[push the branch to origin and set upstream]' \
    '--from[start from a custom ref]:git ref:_gwt_complete_refs' \
    '--no-fetch[skip git fetch --all before creation]' \
    '--print-path[print the created worktree path only]' \
    '1:branch name:_gwt_complete_new_branch'
}

_gwt_cmd_get() {
  _arguments -C \
    '--no-fetch[skip git fetch --all before checkout]' \
    '--print-path[print the created worktree path only]' \
    '1:remote branch:_gwt_complete_remote_branches'
}

_gwt_cmd_rm() {
  _arguments -C \
    '(-r --remote)'{-r,--remote}'[delete the remote branch as well]' \
    '(-f --force)'{-f,--force}'[force removal even with uncommitted changes]' \
    '1:local branch:_gwt_complete_removable_branches'
}

_gwt_cmd_sync() {
  _arguments -C \
    '--rebase[rebase the current worktree after fetching]'
}

_gwt_cmd_pull() {
  _arguments -C \
    '--merge[use merge instead of rebase]'
}

_gwt_cmd_ls() {
  _arguments -C
}

_gwt_cmd_prune() {
  _arguments -C
}

_gwt_cmd_completion() {
  if (( CURRENT == 3 )); then
    _describe -t completion-args 'completion command' \
      'zsh:Generate zsh completion script' \
      'bash:Generate bash completion script' \
      'fish:Generate fish completion script' \
      'install:Install shell completion'
    return 0
  fi

  if [[ ${words[3]} == install ]]; then
    _arguments -C \
      '1:subcommand:(install)' \
      '2:shell:(zsh bash fish)'
    return 0
  fi

  _arguments -C \
    '1:shell:(zsh bash fish install)'
}

_gwt() {
  local curcontext="$curcontext" state line
  typeset -A opt_args

  local -a commands
  commands=(
    'completion:Generate or install shell completion scripts'
    'init:Initialize a bare repo workspace'
    'new:Create a new local branch and worktree from origin/main'
    'get:Checkout an existing remote branch as a local worktree'
    'rm:Remove a worktree and its local branch'
    'sync:Fetch all remote updates into the shared bare repo'
    'pull:Fetch remote updates and rebase the current worktree branch'
    'ls:List all active worktrees'
    'prune:Clean up stale git worktree metadata'
  )

  if (( CURRENT == 2 )); then
    if [[ ${words[CURRENT]} == -* ]]; then
      compadd -- --help --version
      return 0
    fi
    _describe -t commands 'gwt command' commands && return 0
  fi

  case "${words[2]}" in
    completion) _gwt_cmd_completion ;;
    init) _gwt_cmd_init ;;
    new) _gwt_cmd_new ;;
    get) _gwt_cmd_get ;;
    rm) _gwt_cmd_rm ;;
    sync) _gwt_cmd_sync ;;
    pull) _gwt_cmd_pull ;;
    ls) _gwt_cmd_ls ;;
    prune) _gwt_cmd_prune ;;
  esac
}

compdef _gwt {{COMMAND_NAME}}
