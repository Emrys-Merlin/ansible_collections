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

Configuration (`app.ini`)
-------------------------

`app.ini` is edited key-by-key with `community.general.ini_file`. **Never replace
this with a template.** Gitea writes generated state back into the same file —
on this host `WORK_PATH`, `[server] LFS_JWT_SECRET`, `[security] INTERNAL_TOKEN`
and `[oauth2] JWT_SECRET` — and a template silently drops all of it, which breaks
LFS auth, gitea's internal API and every issued OAuth2 token. The role owns the
23 options listed in `tasks/main.yml` and deliberately leaves everything else
alone. The file is `0600`; it holds four secrets.

The consequence to be aware of: anything configured through the gitea UI that
lands in `app.ini` persists and is invisible to this repo. The role does not
own the whole file, only the keys it names.

Database
--------

The database is created by driving `/usr/bin/mysql` through
`ansible.builtin.command`, **not** by `community.mysql.mysql_db`. **Do not
change it back.** That module needs PyMySQL importable from whichever
interpreter Ansible discovers on the target; uberspace has since shipped newer
Pythons, discovery moved to `/usr/bin/python3.14`, and only `/usr/bin/python3`
(3.6) has the library — so the module failed and took the whole `uberspace.yml`
run with it. The client needs no credentials, because uberspace preconfigures
`~/.my.cnf` (0600). `roles/uptime_kuma` does the same thing for the same reason.

The read-only `SHOW DATABASES LIKE` check carries `check_mode: false`; without
it a `--check` run skips the task and the `when` that reads its `stdout` fails.
