Gitea
=====

Launch a [gitea](https://about.gitea.com) instance on uberspace.

Example Playbook
----------------

    - hosts: servers
      roles:
        - role: emrys_merlin.uberspace.gitea
          gitea_db_name: "{{ ansible_user }}_gitea"
          gitea_port: 3001
          gitea_url_path: "/gitea"
          gitea_url: "https://{{ ansible_user }}.uber.space{{ gitea_url_path }}"
          gitea_admin_user: "Retrieve from vault"
          gitea_admin_password: "Retrieve from vault"
