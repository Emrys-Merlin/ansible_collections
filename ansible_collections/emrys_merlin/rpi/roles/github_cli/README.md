Github CLI
=========

Install `gh` and login using a token. If the token, has permission to upload an ssh key and the ssh protocol is configured as default, an ssh key is uploaded to github


Example Playbook
----------------

    - hosts: servers
      roles:
        - role: emrys_merlin.rpi.github_cli
          github_cli_key_file_location: /etc/apt/keyrings/githubcli-archive-keyring.gpg
          github_cli_list_location: /etc/apt/sources.list.d/github-cli.list
          github_cli_protocol: ssh  # https or ssh
          github_cli_access_token: "Read from vault"
         - { role: username.rolename, x: 42 }
