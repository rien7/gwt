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

_gwt_has_positional_before_current() {
  local option_with_value=$1
  local i word expect_value=0

  for (( i = 3; i < CURRENT; i++ )); do
    word=${words[i]}

    if (( expect_value )); then
      expect_value=0
      continue
    fi

    case "$word" in
      ${option_with_value})
        expect_value=1
        ;;
      -*)
        ;;
      *)
        return 0
        ;;
    esac
  done

  return 1
}

_gwt_compadd_options() {
  local -a values
  values=("$@")
  compadd -- "${values[@]}"
}

_gwt_is_command() {
  case "$1" in
    completion|init|new|get|rm|sync|pull|ls|prune)
      return 0
      ;;
  esac

  return 1
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
  if [[ ${words[CURRENT-1]} == --from ]]; then
    _gwt_complete_refs
    return 0
  fi

  if [[ ${words[CURRENT]} == -* ]]; then
    _gwt_compadd_options --from --no-fetch --print-path --push -p
    return 0
  fi

  if ! _gwt_has_positional_before_current '--from'; then
    _gwt_complete_new_branch
    return 0
  fi

  _gwt_compadd_options --from --no-fetch --print-path --push -p
}

_gwt_cmd_get() {
  if [[ ${words[CURRENT]} == -* ]]; then
    _gwt_compadd_options --no-fetch --print-path
    return 0
  fi

  if ! _gwt_has_positional_before_current ''; then
    _gwt_complete_remote_branches
    return 0
  fi

  _gwt_compadd_options --no-fetch --print-path
}

_gwt_cmd_rm() {
  if [[ ${words[CURRENT]} == -* ]]; then
    _gwt_compadd_options --remote -r --force -f
    return 0
  fi

  if ! _gwt_has_positional_before_current ''; then
    _gwt_complete_removable_branches
    return 0
  fi

  _gwt_compadd_options --remote -r --force -f
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

    if _gwt_is_command "${words[2]}"; then
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
      return $?
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
