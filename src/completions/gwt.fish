function __gwt_complete
    {{COMMAND_NAME}} __complete $argv 2>/dev/null
end

complete -c {{COMMAND_NAME}} -n 'not __fish_seen_subcommand_from completion init new get rm sync pull ls prune' -a completion -d 'Generate or install shell completion scripts' -f
complete -c {{COMMAND_NAME}} -n 'not __fish_seen_subcommand_from completion init new get rm sync pull ls prune' -a init -d 'Initialize a bare repo workspace' -f
complete -c {{COMMAND_NAME}} -n 'not __fish_seen_subcommand_from completion init new get rm sync pull ls prune' -a new -d 'Create a new local branch and worktree from origin/main' -f
complete -c {{COMMAND_NAME}} -n 'not __fish_seen_subcommand_from completion init new get rm sync pull ls prune' -a get -d 'Checkout an existing remote branch as a local worktree' -f
complete -c {{COMMAND_NAME}} -n 'not __fish_seen_subcommand_from completion init new get rm sync pull ls prune' -a rm -d 'Remove a worktree and its local branch' -f
complete -c {{COMMAND_NAME}} -n 'not __fish_seen_subcommand_from completion init new get rm sync pull ls prune' -a sync -d 'Fetch all remote updates into the shared bare repo' -f
complete -c {{COMMAND_NAME}} -n 'not __fish_seen_subcommand_from completion init new get rm sync pull ls prune' -a pull -d 'Fetch remote updates and rebase the current worktree branch' -f
complete -c {{COMMAND_NAME}} -n 'not __fish_seen_subcommand_from completion init new get rm sync pull ls prune' -a ls -d 'List all active worktrees' -f
complete -c {{COMMAND_NAME}} -n 'not __fish_seen_subcommand_from completion init new get rm sync pull ls prune' -a prune -d 'Clean stale git worktree metadata' -f
complete -c {{COMMAND_NAME}} -n 'not __fish_seen_subcommand_from completion init new get rm sync pull ls prune' -l help -s h -d 'Display help'
complete -c {{COMMAND_NAME}} -n 'not __fish_seen_subcommand_from completion init new get rm sync pull ls prune' -l version -s v -d 'Display version'

complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from completion; and not __fish_seen_subcommand_from install' -a install -d 'Install shell completion' -f
complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from completion' -a 'zsh bash fish' -d 'Shell' -f

complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from init' -s b -l branch -d 'Default branch name' -r
complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from init' -f

complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from new' -s p -l push -d 'Push the branch to origin and set upstream'
complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from new' -l from -d 'Start from a custom ref' -a '(__gwt_complete refs)' -r -f
complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from new' -l no-fetch -d 'Skip git fetch --all before creation'
complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from new' -l print-path -d 'Print the created worktree path only'

complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from get' -l no-fetch -d 'Skip git fetch --all before checkout'
complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from get' -l print-path -d 'Print the created worktree path only'
complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from get' -a '(__gwt_complete remote-branches)' -f

complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from rm' -s r -l remote -d 'Delete the remote branch as well'
complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from rm' -s f -l force -d 'Force removal even with uncommitted changes'
complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from rm' -a '(__gwt_complete removable-branches)' -f

complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from sync' -l rebase -d 'Rebase the current worktree after fetching'
complete -c {{COMMAND_NAME}} -n '__fish_seen_subcommand_from pull' -l merge -d 'Use merge instead of rebase'
