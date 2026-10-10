import type { Meta, StoryObj } from '@storybook/react-vite'
import { Alert } from '../alert'
import { Kbd } from '../kbd'
import { Table } from '../table'
import { Prose } from './index'

const Rules = () => (
  <>
    <h2>1. Inscripción</h2>
    <p>
      La inscripción cierra <strong>24 horas antes</strong> del torneo. Cada equipo registra cinco
      titulares y hasta dos suplentes con su Riot ID completo.
    </p>
    <ul>
      <li>
        El capitán confirma el check-in <strong>30 minutos</strong> antes de la hora.
      </li>
      <li>Un jugador solo puede estar en un equipo por torneo.</li>
      <li>Las cuentas necesitan nivel 20 o más.</li>
    </ul>
    <h2>2. Partidas</h2>
    <h3>Formato</h3>
    <p>
      Eliminación doble. Todas las series son Bo3 y la gran final es Bo5. El código del lobby
      aparece en tu panel, por ejemplo <code>PITAYA-7Q4K</code>.
    </p>
    <blockquote>
      Si un equipo no se presenta 10 minutos después de la hora, pierde la serie por walkover.
    </blockquote>
    <h3>Premios</h3>
    <table>
      <thead>
        <tr>
          <th>Lugar</th>
          <th>Premio</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1.º</td>
          <td>$3,000 MXN</td>
        </tr>
        <tr>
          <td>2.º</td>
          <td>$1,500 MXN</td>
        </tr>
        <tr>
          <td>3.º y 4.º</td>
          <td>$500 MXN</td>
        </tr>
      </tbody>
    </table>
    <ol>
      <li>Reporta el marcador desde tu panel.</li>
      <li>El rival lo confirma.</li>
    </ol>
    <p>
      ¿Dudas? Escríbenos en <a href="#discord">Discord</a> antes de la fecha límite.
    </p>
  </>
)

const meta = {
  title: 'Components/Prose',
  component: Prose,
  tags: ['autodocs'],
  args: { as: 'article', lang: 'es', children: <Rules /> },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    as: { control: 'inline-radio', options: ['div', 'article', 'section'] },
  },
} satisfies Meta<typeof Prose>

export default meta
type Story = StoryObj<typeof meta>

/** Pitaya-style rules: the content a Markdown renderer would produce. */
export const PitayaRules: Story = {}

export const Small: Story = { args: { size: 'sm' } }

export const Large: Story = { args: { size: 'lg' } }

export const Changelog: Story = {
  args: {
    lang: 'en',
    children: (
      <>
        <h2>0.10.0</h2>
        <p>First publish under @sukunagg.</p>
        <ul>
          <li>
            VideoPlayer moves to <code>@sukunagg/video</code>.
          </li>
          <li>Every component is re-exported from the package root.</li>
        </ul>
        <h2>0.1.0</h2>
        <p>First publish as sukuna-ui: the ten v1 components.</p>
        <hr />
        <p>
          Older notes live in <a href="#changelog">CHANGELOG.md</a>.
        </p>
      </>
    ),
  },
}

/** Library components inside an article keep their own look. */
export const WithComponents: Story = {
  args: {
    lang: 'en',
    children: (
      <>
        <h2>Keyboard shortcuts</h2>
        <p>
          Press <Kbd keys="mod+K" size="sm" /> to search, or a bare key like <kbd>Esc</kbd> from
          Markdown.
        </p>
        <Alert title="Heads up">Shortcuts only work while the page has focus.</Alert>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col">Action</Table.HeaderCell>
              <Table.HeaderCell scope="col">Keys</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Search</Table.Cell>
              <Table.Cell>
                <Kbd keys="mod+K" size="sm" />
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </>
    ),
  },
}
