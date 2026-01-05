import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Edit3, Palette } from 'lucide-react';

export default function EditorTest() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Note Editor Test</h1>
          <p className="text-muted-foreground mt-2">
            Test the note editor functionality and layout
          </p>
        </div>

        {/* Test Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Note
              </CardTitle>
              <CardDescription>
                Test creating a new note with the editor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/notes/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Note
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Edit Existing Note
              </CardTitle>
              <CardDescription>
                Test editing an existing note (if any exist)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/notes">
                  <FileText className="h-4 w-4 mr-2" />
                  View Notes
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features to Test */}
        <Card>
          <CardHeader>
            <CardTitle>Features to Test</CardTitle>
            <CardDescription>
              Verify these features work correctly in the note editor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Layout & Scrolling</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• No full page scrolling</li>
                  <li>• Fixed height editor area</li>
                  <li>• Textarea scrolls independently</li>
                  <li>• Sidebar stays fixed</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Toolbar Functions</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Bold text formatting (**text**)</li>
                  <li>• Italic text formatting (*text*)</li>
                  <li>• Heading formatting (# text)</li>
                  <li>• List formatting (- text)</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Color Themes</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Color picker works</li>
                  <li>• Background changes</li>
                  <li>• Color persists on save</li>
                  <li>• Visual feedback</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">AI Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Pro gating works</li>
                  <li>• Loading states show</li>
                  <li>• Error handling</li>
                  <li>• Voice to text (browser support)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Testing Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Test Layout</h4>
              <p className="text-sm text-muted-foreground">
                Open the editor and verify that the page doesn't scroll. The editor should fill the available height 
                with the textarea being scrollable independently.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">2. Test Toolbar</h4>
              <p className="text-sm text-muted-foreground">
                Select some text and click the formatting buttons (Bold, Italic, Heading, List). 
                The text should be wrapped with markdown formatting.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">3. Test Color Picker</h4>
              <p className="text-sm text-muted-foreground">
                Click the color palette button and select different colors. 
                The editor background should change immediately.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">4. Test AI Features</h4>
              <p className="text-sm text-muted-foreground">
                Try the AI features in the sidebar. Free users should see upgrade prompts, 
                Pro users should see loading states and functionality.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}