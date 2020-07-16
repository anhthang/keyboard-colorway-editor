import React, { useEffect, useState } from 'react';
import './App.scss';
import 'antd/dist/antd.css';
import 'rc-color-picker/assets/index.css';

import * as fetch from 'node-fetch';
import { Select, Card, Cascader, Row, Col, Form, Checkbox, Empty } from 'antd';
import BasicLayout, { PageContainer } from '@ant-design/pro-layout';
import Key from './components/Key';
import ColorPicker from 'rc-color-picker';
// import RightHeader from './components/RightHeader';
import _ from 'lodash';
import colorways from './components/colorways';

const defaultKeyboardColor = '#e0e0e0'

const { Option } = Select

const apiUrl = 'https://kce.anhthang.org'

const keyWidth = 55
const keySpacing = 4
const keyboardBezel = 15

const colorwayNames = _(colorways.list)
  .groupBy(i => i.name.split('-')[0])
  .map((list, manufacturer) => {
    return {
      value: manufacturer,
      label: manufacturer.toUpperCase(),
      children: list.map(c => {
        const parts = c.name.split('-')
        parts.shift()
        const display = parts.map((n) => n.replace(n.charAt(0), n.charAt(0).toUpperCase())).join(' ')

        return {
          value: parts.join('-'),
          label: display,
          children: c.kits ? c.kits.map(k => ({ value: k, label: k.replace(k.charAt(0), k.charAt(0).toUpperCase()) })) : []
        }
      })
    }
  })
  .value()

function App() {
  const [keyboardNames, setKeyboardNames] = useState([])
  const [keyboard, setKeyboard] = useState({})
  const [keyboardColor, setKeyboardColor] = useState('transparent')
  const [keymaps, setKeymaps] = useState({ layout: [] })
  const [colorway, setColorway] = useState(_.sample(colorways.list))
  const [kit, setKit] = useState(null)
  const [useDiffModifier, setChangeModifier] = useState(false)

  useEffect(() => {
    fetch(`${apiUrl}/keyboard_folders.json`)
      .then(res => res.json())
      .then(res => {
        const keyboards = _(res)
          .groupBy('manufacturer')
          .map((list, manufacturer) => {
            return {
              value: manufacturer,
              label: manufacturer,
              children: list.map(board => ({
                value: board.keyboard_folder,
                label: board.keyboard_name,
              }))
            }
          })
          .value()

        setKeyboardNames(keyboards)
      })
  }, [])

  const getLayout = (layout_name, additional) => {
    fetch(`${apiUrl}/layouts/${layout_name}.json`)
      .then(res => res.json())
      .then(res => {
        const kbLayout = {...res, ...additional}
        setKeymaps(kbLayout)
      })
  }

  const selectBoard = (keyboard_name) => {
    fetch(`${apiUrl}/keyboards/${keyboard_name[1]}.json`)
      .then(res => res.json())
      .then(res => {
        setKeyboard(res)
        setKeyboardColor((res.colors && res.colors[0].color) || defaultKeyboardColor)

        const layout = Object.keys(res.layouts)[0]
        if (layout === 'default') {
          // make keyboards which still not change to new format working
          setKeymaps(res.layouts.default)
        } else {
          getLayout(layout, res.layouts[layout])
        }

        // fix bug color name has more than 2 words
        changeColorway(colorway.name.replace('-', '/').split('/'))
      })
  }

  const changeColorway = (name) => {
    const base = name.slice(0, 2).join('-')
    const clw = colorways.list.find(c => c.name === base)
    setColorway(clw)
    setKit(name[2])
  }

  const maxWidth = Array.isArray(keymaps.layout) && keymaps.layout.length
    ? _.max(keymaps.layout.map(k => k.x + (k.w || 1)))
    : 0
  const maxHeight = Array.isArray(keymaps.layout) && keymaps.layout.length
    ? _.max(keymaps.layout.map(k => k.y + (k.h || 1)))
    : 0

  return (
    <BasicLayout
      title="Keyboard Colorway Editor"
      layout="top"
      logo={false}
      headerRender={false}
      // rightContentRender={RightHeader}
    >
      <PageContainer style={{ minHeight: '100vh', margin: 24 }}>
        <Row gutter={16}>
          <Col md={6}>
            <Card className="keyboard-box" title="Options" size="small">
              <Form layout="vertical">
                <Form.Item label="Keyboard">
                  <Cascader showSearch options={keyboardNames} onChange={selectBoard} placeholder="Select Keyboard" />
                </Form.Item>
                <Form.Item label="Keyboard Color">
                  <Select
                    showSearch
                    disabled={!Array.isArray(keyboard.colors) || !keyboard.colors.length}
                    onSelect={(e) => setKeyboardColor(e)}
                    placeholder="Select Keyboard Color">
                    {
                      (keyboard.colors || []).map(c => {
                        return <Option value={c.color} key={c.color}>{c.name}</Option>
                      })
                    }
                  </Select>
                </Form.Item>
                <Form.Item label="Customize Keyboard Color">
                  <ColorPicker.Panel
                    enableAlpha={false}
                    color={defaultKeyboardColor}
                    onChange={(e) => setKeyboardColor(e.color)}
                  />
                </Form.Item>
                <Form.Item label="Keyset">
                  <Cascader
                    showSearch
                    defaultValue={colorway.name.replace('-', '/').split('/')}
                    options={colorwayNames}
                    onChange={changeColorway}
                    placeholder="Select Colorway"
                  />
                </Form.Item>
                <Form.Item>
                  <Checkbox defaultChecked={false} disabled onChange={(e) => setChangeModifier(e.target.checked)}>Change Modifier Colorway</Checkbox>
                </Form.Item>
                {
                  useDiffModifier && (
                    <Form.Item label="Modifier Colorway">
                      <Cascader
                        showSearch
                        options={colorwayNames}
                        placeholder="Select Colorway"
                      />
                    </Form.Item>
                  )
                }
              </Form>
            </Card>
          </Col>
          <Col md={18}>
            <Card className="keyboard-box" title="Keyboard" size="small">
              {keyboard && keyboard.keyboard_name
                ? <Card
                  className="keyboard-drawer"
                  style={{
                    width: keyWidth * maxWidth + keyboardBezel * 2 - keySpacing,
                    height: keyWidth * maxHeight + keyboardBezel * 2 - keySpacing,
                    border: `${keyboardBezel}px solid ${keyboardColor}`,
                    borderRadius: 6,
                    backgroundColor: `${keyboardColor}`
                  }}>
                  {keymaps.layout.map((k, idx) => {
                    const key = {...k, ...keymaps.override && keymaps.override[k.code]}

                    return <Key key={idx} info={key} colorway={colorway} kit={kit} />
                  })}
                </Card>
                : <Empty
                    image='./logo256.png'
                    imageStyle={{ height: 'auto'}}
                    description='No Keyboard Selected'
                  />
              }
            </Card>
          </Col>
        </Row>
        
      </PageContainer>
    </BasicLayout>
  )
}

export default App;
