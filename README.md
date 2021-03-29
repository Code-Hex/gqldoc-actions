# gqldoc actions

An action for generating graphql documents used by [gqldoc](https://github.com/Code-Hex/gqldoc).

## Usage

See [action.yml](action.yml)

### Example Workflow file

```yaml
name: Generate Document and Commit
on:
  push:
    branches:
      - main
  pull_request:
jobs:
  update-docs:
    name: Update Documents
    runs-on: ubuntu-latest
    steps:
      - name: Check out code
        uses: actions/checkout@v2
        with:
          persist-credentials: false # otherwise, the token used is the GITHUB_TOKEN, instead of your personal token
          fetch-depth: 0 # otherwise, you will failed to push refs to dest repo
      - name: Push Generated GraphQL Document Current Branch
        uses: Code-Hex/gqldoc-actions@v1.0.7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          schema: schema.graphql
          output: doc_dir
```

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)