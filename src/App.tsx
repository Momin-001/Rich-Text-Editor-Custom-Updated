import { RichTextEditor } from './index'

function App() {

  return (
    <>
      <RichTextEditor placeholder="Enter your text here"
       mentionTabs={[
        { id: "users", label: "Users", getData: async () => { return [{ id: "1", displayName: "John Doe", image: "https://via.placeholder.com/150", type: "USER" }]; }, iconKey: "users" }, 
        { id: "items", label: "Items", getData: async () => { return [{ id: "1", displayName: "Item 1", image: "https://via.placeholder.com/150", type: "ITEM" }]; }, iconKey: "items" }] }
       onChange={() => {}}
       />
    </>
  )
}

export default App
