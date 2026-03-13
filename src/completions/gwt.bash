_gwt_complete_kind() {
  local kind=$1
  local values
  values="$({{COMMAND_NAME}} __complete "$kind" 2>/dev/null)"
  COMPREPLY=( $(compgen -W "$values" -- "$cur") )
}

_gwt_positional_count_before_current() {
  local option_with_value=$1
  local count=0
  local expect_value=0
  local i word

  for ((i = 2; i < COMP_CWORD; i++)); do
    word="${COMP_WORDS[i]}"

    if (( expect_value )); then
      expect_value=0
      continue
    fi

    case "$word" in
      "$option_with_value")
        expect_value=1
        ;;
      -*)
        ;;
      *)
        ((count++))
        ;;
    esac
  done

  printf '%s' "$count"
}

_gwt_completion() {
  local cur prev cmd
  local positional_count
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"
  cmd="${COMP_WORDS[1]}"

  if [[ $COMP_CWORD -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "completion init new get rm sync pull ls prune --help --version" -- "$cur") )
    return 0
  fi

  case "$cmd" in
    completion)
      if [[ $COMP_CWORD -eq 2 ]]; then
        COMPREPLY=( $(compgen -W "install zsh bash fish" -- "$cur") )
      elif [[ ${COMP_WORDS[2]} == install && $COMP_CWORD -eq 3 ]]; then
        COMPREPLY=( $(compgen -W "zsh bash fish" -- "$cur") )
      fi
      ;;
    init)
      if [[ $prev == "-b" || $prev == "--branch" ]]; then
        return 0
      fi
      if [[ $COMP_CWORD -eq 3 ]]; then
        COMPREPLY=( $(compgen -d -- "$cur") )
      fi
      ;;
    new)
      if [[ $prev == "--from" ]]; then
        _gwt_complete_kind refs
      elif [[ $cur == -* ]]; then
        COMPREPLY=( $(compgen -W "--from --no-fetch --print-path --push -p" -- "$cur") )
      else
        positional_count="$(_gwt_positional_count_before_current --from)"
        if [[ $positional_count -gt 0 ]]; then
          COMPREPLY=( $(compgen -W "--from --no-fetch --print-path --push -p" -- "$cur") )
        fi
      fi
      ;;
    get)
      positional_count="$(_gwt_positional_count_before_current '')"
      if [[ $cur == -* ]]; then
        COMPREPLY=( $(compgen -W "--no-fetch --print-path" -- "$cur") )
      elif [[ $positional_count -eq 0 ]]; then
        _gwt_complete_kind remote-branches
      fi
      ;;
    rm)
      positional_count="$(_gwt_positional_count_before_current '')"
      if [[ $cur == -* ]]; then
        COMPREPLY=( $(compgen -W "--remote -r --force -f" -- "$cur") )
      elif [[ $positional_count -eq 0 ]]; then
        _gwt_complete_kind removable-branches
      fi
      ;;
    sync)
      if [[ $cur == -* ]]; then
        COMPREPLY=( $(compgen -W "--rebase" -- "$cur") )
      fi
      ;;
    pull)
      if [[ $cur == -* ]]; then
        COMPREPLY=( $(compgen -W "--merge" -- "$cur") )
      fi
      ;;
  esac

  return 0
}

complete -F _gwt_completion {{COMMAND_NAME}}
