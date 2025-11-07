import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ComplianceMeter } from '@/components/ComplianceMeter'
import { MagnifyingGlass, CheckCircle, XCircle } from '@phosphor-icons/react'
import { mockTrainingProducts } from '@/lib/mockData'
import { useState } from 'react'

export function TrainingView() {
  const [searchQuery, setSearchQuery] = useState('')
  
  const filteredProducts = mockTrainingProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Training Products</h2>
        <p className="text-muted-foreground mt-1">Course documentation and compliance tracking</p>
      </div>

      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="training-search"
          placeholder="Search by course name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                      {product.status}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-xs">
                      {product.code}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ComplianceMeter 
                percentage={product.completeness} 
                label="Documentation Completeness"
              />
              
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  {product.hasSOP ? (
                    <CheckCircle className="w-4 h-4 text-success" weight="fill" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" weight="fill" />
                  )}
                  <span className="text-muted-foreground">SOP</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {product.hasAssessment ? (
                    <CheckCircle className="w-4 h-4 text-success" weight="fill" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" weight="fill" />
                  )}
                  <span className="text-muted-foreground">Assessment</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {product.hasValidation ? (
                    <CheckCircle className="w-4 h-4 text-success" weight="fill" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" weight="fill" />
                  )}
                  <span className="text-muted-foreground">Validation</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No training products found matching "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-primary text-sm mt-2 hover:underline"
            >
              Clear search
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
