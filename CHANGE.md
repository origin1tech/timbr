# Change Log

### 10.7.2017 (1.0.3)

<table>
  <tr><td>.npmignore</td><td>ignore unnecessary folders.</td></tr>
</table>

### 10.5.2017 (1.1.0)

<table>
  <tr><td>write</td><td>better handling for write method, formatted message includes metatdata if present.</td></tr>
  <tr><td>logger</td><td>simplified internal flags for logger method.</td></tr>
  <tr><td>events</td><td>emitted events use 'log:type' instead of 'logged:type' where type is info, warn, error etc.</td></tr>
</table>

### 10.5.2017 (1.0.2)

<table>
  <tr><td>labelLevels</td><td>Enable property to toggle the level type label in logged messages.</td></tr>
  <tr><td>errorConstruct</td><td>When true and if error log level construct messages using new Error().</td></tr>
</table>

### 9.18.2017 (1.0.1)

<table>
  <tr><td>normalizeLevels</td><td>Fix issue where default level fell back to debug in error.</td></tr>
  <tr><td>initial commit</td><td>Initial release of Timbr.</td></tr>
</table>