import { useState, useEffect } from 'react';
import { Container, Navbar, Nav, Button, Card, Form, ListGroup, Alert, Spinner, Modal } from 'react-bootstrap';
import { auth, db, storage } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Firestore state
  interface Item {
    id: string;
    text?: string;
    userId?: string;
  }
  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState('');
  
  // Storage state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'items');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
    } catch (error: unknown) {
      if (error instanceof Error) {
        setAuthError(error.message);
      } else {
        setAuthError(String(error));
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    try {
      await addDoc(collection(db, 'items'), {
        text: newItem,
        userId: user?.uid,
        createdAt: serverTimestamp()
      });
      setNewItem('');
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `uploads/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFileUrl(url);
    } catch (error) {
      console.error("Error uploading file: ", error);
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="app-container bg-light min-vh-100">
      <Navbar bg="primary" variant="dark" expand="lg" className="shadow-sm mb-4">
        <Container>
          <Navbar.Brand href="#home">Lydo Compliance System</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
            <Nav>
              {user ? (
                <div className="d-flex align-items-center">
                  <span className="text-light me-3">{user.email}</span>
                  <Button variant="outline-light" onClick={logout}>Sign Out</Button>
                </div>
              ) : (
                <Button variant="light" className="text-primary fw-bold" onClick={() => setShowAuthModal(true)}>Sign In / Register</Button>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container>
        {!user ? (
          <Alert variant="info" className="text-center shadow-sm">
            <Alert.Heading>Welcome to Lydo Compliance</Alert.Heading>
            <p>Please sign in to access Firestore and Storage features.</p>
          </Alert>
        ) : (
          <div className="row g-4">
            <div className="col-md-6">
              <Card className="shadow-sm border-0 h-100">
                <Card.Header className="bg-white border-bottom-0 pt-4 pb-0">
                  <h5 className="text-primary mb-0">Firestore Data</h5>
                </Card.Header>
                <Card.Body>
                  <Form onSubmit={handleAddItem} className="mb-4">
                    <Form.Group className="d-flex gap-2">
                      <Form.Control
                        type="text"
                        placeholder="Add a new item..."
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                      />
                      <Button variant="primary" type="submit">Add</Button>
                    </Form.Group>
                  </Form>
                  <ListGroup variant="flush" className="border rounded">
                    {items.length === 0 ? (
                      <ListGroup.Item className="text-muted text-center py-4">No items yet</ListGroup.Item>
                    ) : (
                      items.map(item => (
                        <ListGroup.Item key={item.id} className="d-flex justify-content-between align-items-center">
                          {item.text}
                          <small className="text-muted text-truncate" style={{maxWidth: '100px'}}>{item.id}</small>
                        </ListGroup.Item>
                      ))
                    )}
                  </ListGroup>
                </Card.Body>
              </Card>
            </div>

            <div className="col-md-6">
              <Card className="shadow-sm border-0 h-100">
                <Card.Header className="bg-white border-bottom-0 pt-4 pb-0">
                  <h5 className="text-primary mb-0">Storage Uploads</h5>
                </Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3">
                    <Form.Label>Select a file to upload</Form.Label>
                    <Form.Control 
                      type="file" 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)} 
                    />
                  </Form.Group>
                  <Button 
                    variant="success" 
                    onClick={handleUpload} 
                    disabled={!file || uploading}
                    className="w-100 mb-3"
                  >
                    {uploading ? (
                      <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Uploading...</>
                    ) : 'Upload File'}
                  </Button>
                  
                  {fileUrl && (
                    <Alert variant="success" className="mb-0">
                      File uploaded successfully! <br/>
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="alert-link text-break">View File</a>
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </div>
          </div>
        )}
      </Container>

      <Modal show={showAuthModal} onHide={() => setShowAuthModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-primary">{isLoginMode ? 'Sign In' : 'Register'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {authError && <Alert variant="danger">{authError}</Alert>}
          <Form onSubmit={handleAuth}>
            <Form.Group className="mb-3">
              <Form.Label>Email address</Form.Label>
              <Form.Control 
                type="email" 
                placeholder="Enter email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Password</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>
            
            <Button variant="primary" type="submit" className="w-100 mb-3">
              {isLoginMode ? 'Sign In' : 'Register'}
            </Button>
          </Form>
          <div className="text-center">
            <Button variant="link" onClick={() => setIsLoginMode(!isLoginMode)}>
              {isLoginMode ? 'Need an account? Register here.' : 'Already have an account? Sign in.'}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default App;
